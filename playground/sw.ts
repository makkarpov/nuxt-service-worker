// Random imports to test whether they are actually resolved:

import * as colors from 'color-name';
import { getMeowingString } from '~/lib/swHelper';

// Comment for change testing: 123456

self.addEventListener('install', (ev) => {
  console.log('service worker installed', ev);
  console.log('meowing string is: ', getMeowingString());
});

self.addEventListener('activate', (ev) => {
  console.log('service worker activated', ev);
  console.log('red color is: ', colors.red);
});
