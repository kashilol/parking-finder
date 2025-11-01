import React from 'react';
   import ReactDOM from 'react-dom/client';
   import App from './App.jsx';
   import './i18n.js';
   import './index.css';

   console.log('React script running');
   console.log('i18next available:', !!window.i18next);
   console.log('ReactDOM available:', !!ReactDOM);
   console.log('Root element:', document.getElementById('root'));

   const root = ReactDOM.createRoot(document.getElementById('root'));
   root.render(<App />);