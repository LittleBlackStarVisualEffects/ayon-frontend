import ReactDOM from 'react-dom'
import React from 'react'

import { createStore } from 'redux'
import { Provider as ReduxProvider } from 'react-redux'
import { Provider as FetchProvider } from 'use-http'
import { ToastContainer, Flip } from 'react-toastify'

import reducer from './reducer'

import App from './app'

import 'react-toastify/dist/ReactToastify.css'

import 'primereact/resources/themes/arya-blue/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'

import './styles/index.sass'

const store = createStore(reducer)

const fetchOptions = {
  cachePolicy: 'no-cache',
  interceptors: {
    request: ({ options, url, path, route }) => {
      const token = localStorage.getItem('accessToken')
      options.headers.Authorization = `Bearer ${token}`
      return options
    },
  },
}

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(
    <React.StrictMode>
      <ReduxProvider store={store}>
        <FetchProvider options={fetchOptions}>
          <App />
          <ToastContainer
            position="bottom-right"
            transition={Flip}
            theme="dark"
            pauseOnFocusLoss={false}
            newestOnTop={true}
            draggable={false}
            closeOnClick={true}
            autoClose={2000}
            limit={5}
          />
        </FetchProvider>
      </ReduxProvider>
    </React.StrictMode>,
    document.getElementById('root')
  )
})
