import ReactGA from 'react-ga4';

export const initGA = () => {
  ReactGA.initialize('G-XL3LZQB2FW');
};

export const logPageView = (path: string) => {
  ReactGA.send({ hitType: 'pageview', page: path });
};
