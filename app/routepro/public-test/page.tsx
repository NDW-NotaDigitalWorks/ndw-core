// app/routepro/public-test/page.tsx
export default function PublicTestPage() {
  return (
    <html>
      <body>
        <div style={{ padding: '40px', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ color: '#22c55e' }}>✅ PAGINA PUBBLICA DI TEST</h1>
          <p>Questa pagina NON ha controlli di autenticazione</p>
          <p>Timestamp: {new Date().toLocaleString()}</p>
          <hr style={{ margin: '20px 0' }} />
          <h2>Informazioni utili:</h2>
          <ul>
            <li>URL corrente: <code id="url"></code></li>
            <li>User Agent: <code id="ua"></code></li>
          </ul>
          <script dangerouslySetInnerHTML={{
            __html: `
              document.getElementById('url').textContent = window.location.href;
              document.getElementById('ua').textContent = navigator.userAgent;
            `
          }} />
        </div>
      </body>
    </html>
  );
}