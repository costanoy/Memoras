import React from 'react';
import { Composition } from 'remotion';
import { Memoras } from './Memoras';
import { FPS } from './time';

export const Root = () => (
  <Composition id="Memoras" component={Memoras} durationInFrames={30 * FPS} fps={FPS} width={1080} height={1920} />
);
