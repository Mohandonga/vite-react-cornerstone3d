import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import Nifti from './Nifti.tsx'
import Video from "./Video_files/Video.tsx"
import Referance_cursor from "./Referance_cursor_files/Referance_cursor.tsx"
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* <App /> */}
    <Referance_cursor />
    {/* <Video /> */}
    {/* <Nifti /> */}
  </React.StrictMode>,
)
