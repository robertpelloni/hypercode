// React DevTools: connects to standalone react-devtools app (npm install -g react-devtools)
// Only attempts connection in dev mode (Vite serves on localhost:5173)
if (window.location.hostname === 'localhost') {
	// Use fetch to check if the devtools server is actually listening before injecting script
	// This prevents the "Loading failed for <script>" error in the browser console
	fetch('http://localhost:8097', { mode: 'no-cors', cache: 'no-store' })
		.then(function() {
			console.log('[Maestro] React DevTools server detected, connecting...');
			var script = document.createElement('script');
			script.src = 'http://localhost:8097';
			script.async = false;
			document.head.appendChild(script);
		})
		.catch(function() {
			// Silent fail - devtools server not running
		});
}
