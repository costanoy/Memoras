import React from 'react';
import { Composition } from 'remotion';
import { Memoras } from './Memoras';
import { DURATION, FPS } from './time';

export const Root = () => (
  <Composition id="Memoras" component={Memoras} durationInFrames={DURATION * FPS} fps={FPS} width={1080} height={1920} />
);
