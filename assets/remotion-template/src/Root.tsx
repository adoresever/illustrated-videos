import React from 'react';
import {Composition} from 'remotion';
import rawProject from '../public/project.json';
import {IllustratedVideo} from './IllustratedVideo';
import type {Project} from './types';

const project = rawProject as Project;
const stylePreset = project.stylePreset ?? 'paper-cut';

if (stylePreset !== 'paper-cut') {
  throw new Error(`Unsupported stylePreset in v1: ${stylePreset}. The only verified preset is paper-cut.`);
}

export const Root: React.FC = () => {
  return (
    <Composition
      id="IllustratedVideo"
      component={IllustratedVideo}
      durationInFrames={project.durationInFrames}
      fps={project.fps}
      width={project.width}
      height={project.height}
      defaultProps={{project}}
    />
  );
};
