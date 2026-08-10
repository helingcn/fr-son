/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/screens/FaceEnrollmentScreen', () => {
  const MockReact = require('react');
  const ReactNative = require('react-native');
  return {
    FaceEnrollmentScreen: () =>
      MockReact.createElement(ReactNative.View, { testID: 'face-enrollment' }),
  };
});

jest.mock('../src/screens/FaceVerificationScreen', () => {
  const MockReact = require('react');
  const ReactNative = require('react-native');
  return {
    FaceVerificationScreen: () =>
      MockReact.createElement(ReactNative.View, {
        testID: 'face-verification',
      }),
  };
});

const App = require('../App').default;

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
