import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import './App.css';

export default function App() {
  const [code, setCode] = useState<string>(`// Type your JavaScript here
console.log('Hello world!');
`);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const getSrcDoc = (): string =>
    `<!doctype html>
<html>
  <head><meta charset="utf-8"/></head>
  <body>
    <script>
      (function(){
        function send(type, payload){
          parent.postMessage({ source: 'playground', type: type, payload: payload }, '*');
        }
        console.log = (...args) => send('log', args);
        console.error = (err) => send('error', String(err));

        window.addEventListener('message', function(e){
          try {
            if (!e.data || e.data.source !== 'playground-parent' || e.data.type !== 'run') return;
            try {
              new Function(e.data.code)();
            } catch(err) {
              send('error', err.stack || err);
            }
          } catch(e) {
            send('error', e.message || e);
          }
        });
        send('ready', null);
      })();
    </script>
  </body>
</html>`;

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as any;
      if (!data || data.source !== 'playground') return;

      if (data.type === 'log') {
        const arr = Array.isArray(data.payload) ? data.payload : [data.payload];
        const formatted = arr
          .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
          .join(' ');
        setLogs((prev) => [...prev, formatted]);
      } else if (data.type === 'error') {
        const msg =
          typeof data.payload === 'string'
            ? data.payload
            : String(data.payload);
        setLogs((prev) => [...prev, 'Error: ' + msg]);
      } else if (data.type === 'ready') {
        setLogs((prev) => [...prev, '[sandbox ready]']);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const runCode = () => {
    setLogs([]);
    const iframe = iframeRef.current;
    if (!iframe) return;

    if (iframe.srcdoc !== getSrcDoc()) {
      iframe.srcdoc = getSrcDoc();
      setTimeout(() => {
        iframe.contentWindow?.postMessage(
          { source: 'playground-parent', type: 'run', code },
          '*'
        );
      }, 50);
    } else {
      iframe.contentWindow?.postMessage(
        { source: 'playground-parent', type: 'run', code },
        '*'
      );
    }
  };

  return (
    <div className='container'>
      <h2>JavaScript Playground with Monaco</h2>

      <Editor
        height='300px'
        defaultLanguage='javascript'
        value={code}
        onChange={(value) => setCode(value || '')}
        theme='vs-dark'
        options={{
          lineNumbers: 'on',
          fontSize: 14,
          minimap: { enabled: false },
        }}
      />

      <div className='buttons'>
        <button onClick={runCode}>Run Code</button>
        <button onClick={() => setLogs([])}>Clear Console</button>
      </div>

      {/* Hidden iframe for sandbox execution */}
      <iframe
        ref={iframeRef}
        title='sandbox'
        className='preview'
        sandbox='allow-scripts'
      />

      <div className='console'>
        <h3>Console:</h3>
        <pre>{logs.join('\n')}</pre>
      </div>
    </div>
  );
}
