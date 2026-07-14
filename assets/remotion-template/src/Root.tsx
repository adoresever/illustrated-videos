import React from 'react';
import {Composition} from 'remotion';
import rawProject from '../public/project.json';
import {IllustratedVideo} from './IllustratedVideo';
import type {Project} from './types';

const project = rawProject as Project;
const stylePreset = project.stylePreset ?? 'paper-cut';
const contentMode = project.contentMode ?? 'explainer';
const assetStrategy = project.assetStrategy ?? 'layered';

if (stylePreset !== 'paper-cut') {
  throw new Error(`Unsupported stylePreset in v1: ${stylePreset}. The only verified preset is paper-cut.`);
}
if (!['explainer', 'book-review'].includes(contentMode)) {
  throw new Error(`Unsupported contentMode: ${contentMode}.`);
}
if (!['layered', 'scene-illustrations'].includes(assetStrategy)) {
  throw new Error(`Unsupported assetStrategy: ${assetStrategy}.`);
}
if (contentMode === 'explainer' && assetStrategy !== 'layered') {
  throw new Error('explainer mode requires assetStrategy=layered in this release.');
}
if (contentMode === 'book-review' && assetStrategy !== 'scene-illustrations') {
  throw new Error('book-review mode requires assetStrategy=scene-illustrations in this release.');
}
if (contentMode === 'book-review') {
  const realText = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim()) && !/^<.*>$/.test(value.trim());
  for (const field of ['title', 'author', 'angle'] as const) {
    if (!realText(project.book?.[field])) throw new Error(`book-review project.book.${field} must contain real text.`);
  }
  if (project.book?.originalTitle != null && project.book.originalTitle !== '' && !realText(project.book.originalTitle)) {
    throw new Error('book-review project.book.originalTitle must be removed or replaced with real text.');
  }
}
if (project.captionSafeBottom != null && (!Number.isInteger(project.captionSafeBottom) || project.captionSafeBottom < 0 || project.captionSafeBottom >= project.height / 2)) {
  throw new Error('captionSafeBottom must be a non-negative integer below half the composition height.');
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
