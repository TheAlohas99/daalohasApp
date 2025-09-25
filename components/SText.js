import React from 'react';
import { Text } from 'react-native';
import { displayString } from '../utils/display';

export default function SText({ children, ...rest }) {
  const content =
    children == null
      ? ''
      : typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : displayString(children);
  return <Text {...rest}>{content}</Text>;
}
