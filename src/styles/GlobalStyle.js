import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #ffffff;
  }

  #root {
    height: 100vh;
    width: 100vw;
  }

  input[type="number"] {
    padding: 5px;
  }

  input[type="range"] {
    width: 100%;
  }

  input[type="checkbox"] {
    margin-right: 8px;
  }
`;

export default GlobalStyle; 