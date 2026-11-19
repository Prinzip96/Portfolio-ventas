const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3456;
const BASE_URL = `http://localhost:${PORT}`;
const BOCETO_URL = `${BASE_URL}/boceto/b/TESTTOKEN1234567`;

async function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '../src/server.js');
    const server = spawn('node', [serverPath], {
      env: {
        ...process.env,
        PORT: String(PORT),
        BASE_PATH: '/boceto',
        DATA_DIR: '/tmp/boceto-test-data',
        NODE_ENV: 'development',
        ESTUDIO_NOMBRE: 'Test Studio',
        ESTUDIO_WEB: 'https://www.test.com',
        CONTACTO_EMAIL: 'test@test.com'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    server.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Server]', output.trim());
      if (output.includes('en marcha')) {
        setTimeout(() => resolve(server), 1000);
      }
    });

    server.stderr.on('data', (data) => {
      console.error('[Server Error]', data.toString().trim());
    });

    server.on('error', (err) => {
      reject(err);
    });

    setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 10000);
  });
}

async function runTests() {
  let server;
  const browser = await chromium.launch({ headless: true });
  
  try {
    console.log('\n=== Iniciando servidor de prueba ===\n');
    server = await startServer();
    
    console.log('\n=== Test 1: Vista normal - Clics funcionan ===\n');
    const context1 = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page1 = await context1.newPage();
    await page1.goto(BOCETO_URL, { waitUntil: 'networkidle' });
    
    // Esperar a que el iframe cargue
    const iframe = page1.frameLocator('.view-frame').first();
    await iframe.locator('#entrarBtn').waitFor({ state: 'visible', timeout: 5000 });
    
    // Clic en "Entrar a la demo" dentro del iframe
    await iframe.locator('#entrarBtn').click();
    
    // Verificar que aparece el mensaje
    const resultado = await iframe.locator('#resultado').textContent();
    if (resultado.includes('Hola, Miguel.')) {
      console.log('✅ PASS: Los clics funcionan en vista normal');
    } else {
      console.error('❌ FAIL: Los clics NO funcionan en vista normal. Resultado:', resultado);
    }
    
    await context1.close();
    
    console.log('\n=== Test 2: Pantalla completa - Iframe 100vw x 100vh ===\n');
    const context2 = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page2 = await context2.newPage();
    
    // Capturar logs de JavaScript
    page2.on('console', msg => {
      const text = msg.text();
      if (text.startsWith('[FS]') || msg.type() === 'error') {
        console.log(`[Browser ${msg.type()}]`, text);
      }
    });
    page2.on('pageerror', err => {
      console.log('[Page Error]', err.message);
    });
    
    await page2.goto(BOCETO_URL, { waitUntil: 'networkidle' });
    
    // Verificar que el botón existe
    const btnExists = await page2.locator('#fullscreenBtn').count();
    console.log(`Botón "Ver en grande" encontrado: ${btnExists} vez(ces)`);
    
    // Verificar que el onclick está registrado
    const hasOnClick = await page2.evaluate(() => {
      const btn = document.getElementById('fullscreenBtn');
      return btn && typeof btn.onclick === 'function';
    });
    console.log(`onclick registrado: ${hasOnClick}`);
    
    // Pulsar "Ver en grande"
    console.log('Haciendo clic en "Ver en grande"...');
    await page2.locator('#fullscreenBtn').click();
    
    // Esperar más tiempo para que el fallback se active (300ms timeout + margen)
    await page2.waitForTimeout(1500);
    
    // Depurar el estado del overlay
    const overlayHiddenAttr = await page2.locator('#fullscreenOverlay').getAttribute('hidden');
    const overlayDisplay = await page2.locator('#fullscreenOverlay').evaluate(el => {
      const computed = window.getComputedStyle(el).display;
      const inline = el.style.display;
      return { computed, inline };
    });
    console.log(`Overlay hidden attr: ${overlayHiddenAttr}, computed display: ${overlayDisplay.computed}, inline display: ${overlayDisplay.inline}`);
    
    // Verificar que el overlay está visible
    const overlayVisible = await page2.locator('#fullscreenOverlay').isVisible();
    if (!overlayVisible) {
      console.error('❌ FAIL: El overlay de pantalla completa NO está visible');
      // Intentar verificar el fallback
      console.log('Verificando si el fallback se activó...');
    } else {
      console.log('✅ El overlay está visible');
    }
    
    // Medir el iframe dentro del fullscreen-content
    const fsIframe = page2.locator('#fullscreenContent .view-frame');
    const box = await fsIframe.boundingBox();
    
    if (box) {
      const viewport = page2.viewportSize();
      const widthMatch = Math.abs(box.width - viewport.width) < 2;
      const heightMatch = Math.abs(box.height - viewport.height) < 2;
      
      console.log(`Viewport: ${viewport.width}x${viewport.height}`);
      console.log(`Iframe:   ${box.width}x${box.height}`);
      console.log(`Position: x=${box.x}, y=${box.y}`);
      
      if (widthMatch && heightMatch) {
        console.log('✅ PASS: El iframe ocupa 100vw x 100vh en pantalla completa');
      } else {
        console.error('❌ FAIL: El iframe NO ocupa 100vw x 100vh');
        console.error(`  Diferencia: width=${Math.abs(box.width - viewport.width)}px, height=${Math.abs(box.height - viewport.height)}px`);
      }
      
      // Verificar que no hay marco visible (chrome, barra de puntitos)
      const chromeVisible = await page2.locator('#fullscreenContent .chrome').isVisible().catch(() => false);
      if (chromeVisible) {
        console.error('❌ FAIL: La barra chrome sigue visible en pantalla completa');
      } else {
        console.log('✅ La barra chrome está oculta');
      }
    } else {
      console.error('❌ FAIL: No se pudo medir el iframe en pantalla completa');
    }
    
    console.log('\n=== Test 3: Pantalla completa - Clics funcionan ===\n');
    
    // Verificar que los clics funcionan dentro del iframe a pantalla completa
    const fsIframeLocator = page2.frameLocator('#fullscreenContent .view-frame').first();
    await fsIframeLocator.locator('#entrarBtn').waitFor({ state: 'visible', timeout: 5000 });
    await fsIframeLocator.locator('#entrarBtn').click();
    
    const resultadoFs = await fsIframeLocator.locator('#resultado').textContent();
    if (resultadoFs.includes('Hola, Miguel.')) {
      console.log('✅ PASS: Los clics funcionan en pantalla completa');
    } else {
      console.error('❌ FAIL: Los clics NO funcionan en pantalla completa. Resultado:', resultadoFs);
    }
    
    console.log('\n=== Test 4: Cerrar con ✕ ===\n');
    
    // Clic en el botón cerrar
    await page2.locator('#fullscreenClose').click();
    await page2.waitForTimeout(300);
    
    const overlayHidden = await page2.locator('#fullscreenOverlay').isHidden();
    if (overlayHidden) {
      console.log('✅ PASS: La vista se cierra correctamente con ✕');
    } else {
      console.error('❌ FAIL: La vista NO se cierra con ✕');
    }
    
    await context2.close();
    
    console.log('\n=== Test 5: Cerrar con Esc ===\n');
    const context3 = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page3 = await context3.newPage();
    await page3.goto(BOCETO_URL, { waitUntil: 'networkidle' });
    
    await page3.locator('#fullscreenBtn').click();
    await page3.waitForTimeout(500);
    
    // Presionar Esc
    await page3.keyboard.press('Escape');
    await page3.waitForTimeout(300);
    
    const overlayHiddenEsc = await page3.locator('#fullscreenOverlay').isHidden();
    if (overlayHiddenEsc) {
      console.log('✅ PASS: La vista se cierra correctamente con Esc');
    } else {
      console.error('❌ FAIL: La vista NO se cierra con Esc');
    }
    
    await context3.close();
    
    console.log('\n=== Test 6: Vista móvil - Clics funcionan ===\n');
    const context4 = await browser.newContext({
      viewport: { width: 375, height: 667 }
    });
    const page4 = await context4.newPage();
    await page4.goto(BOCETO_URL, { waitUntil: 'networkidle' });
    
    const iframeMobile = page4.frameLocator('.view-frame').first();
    await iframeMobile.locator('#entrarBtn').waitFor({ state: 'visible', timeout: 5000 });
    await iframeMobile.locator('#entrarBtn').click();
    
    const resultadoMobile = await iframeMobile.locator('#resultado').textContent();
    if (resultadoMobile.includes('Hola, Miguel.')) {
      console.log('✅ PASS: Los clics funcionan en vista móvil');
    } else {
      console.error('❌ FAIL: Los clics NO funcionan en vista móvil. Resultado:', resultadoMobile);
    }
    
    console.log('\n=== Test 7: Móvil - Pantalla completa ===\n');
    await page4.locator('#fullscreenBtn').click();
    await page4.waitForTimeout(500);
    
    const fsIframeMobile = page4.locator('#fullscreenContent .view-frame');
    const boxMobile = await fsIframeMobile.boundingBox();
    
    if (boxMobile) {
      const viewportMobile = page4.viewportSize();
      const widthMatchMobile = Math.abs(boxMobile.width - viewportMobile.width) < 2;
      const heightMatchMobile = Math.abs(boxMobile.height - viewportMobile.height) < 2;
      
      console.log(`Viewport móvil: ${viewportMobile.width}x${viewportMobile.height}`);
      console.log(`Iframe móvil:   ${boxMobile.width}x${boxMobile.height}`);
      
      if (widthMatchMobile && heightMatchMobile) {
        console.log('✅ PASS: El iframe ocupa 100vw x 100vh en móvil');
      } else {
        console.error('❌ FAIL: El iframe NO ocupa 100vw x 100vh en móvil');
      }
    }
    
    await context4.close();
    
    console.log('\n=== Todos los tests completados ===\n');
    
  } catch (error) {
    console.error('\n❌ Error durante los tests:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
    if (server) {
      console.log('\n=== Deteniendo servidor ===\n');
      server.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

runTests().catch(console.error);
