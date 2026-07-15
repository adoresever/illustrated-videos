import React from 'react';
import {Composition} from 'remotion';
import rawProject from '../public/project.json';
import {IllustratedVideo} from './IllustratedVideo';
import type {Project} from './types';

const project = rawProject as Project;
const stylePreset = project.stylePreset ?? 'paper-cut';
const contentMode = project.contentMode === 'book-review' ? 'book' : (project.contentMode ?? 'explainer');
const assetStrategy = project.assetStrategy ?? 'layered';

if (stylePreset !== 'paper-cut') {
  throw new Error(`Unsupported stylePreset in v1: ${stylePreset}. The only verified preset is paper-cut.`);
}
if (!['explainer', 'book'].includes(contentMode)) {
  throw new Error(`Unsupported contentMode: ${contentMode}.`);
}
if (assetStrategy !== 'layered') {
  throw new Error('All publishable projects require assetStrategy=layered. Composite scene illustrations are not a valid production strategy.');
}
if (contentMode === 'book') {
  const realText = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim()) && !/^<.*>$/.test(value.trim());
  for (const field of ['title', 'author', 'angle'] as const) {
    if (!realText(project.book?.[field])) throw new Error(`book project.book.${field} must contain real text.`);
  }
  if (project.book?.originalTitle != null && project.book.originalTitle !== '' && !realText(project.book.originalTitle)) {
    throw new Error('book project.book.originalTitle must be removed or replaced with real text.');
  }
}
if (project.captionSafeBottom != null && (!Number.isInteger(project.captionSafeBottom) || project.captionSafeBottom < 0 || project.captionSafeBottom >= project.height / 2)) {
  throw new Error('captionSafeBottom must be a non-negative integer below half the composition height.');
}
if (project.brand?.show === true && !project.brand.handle?.trim() && !project.brand.logo?.trim()) {
  throw new Error('brand.show requires brand.handle, brand.logo, or both.');
}

export const Root: React.FC = () => {
  const normalizedProject: Project = {...project, contentMode};
  return (
    <Composition
      id="IllustratedVideo"
      component={IllustratedVideo}
      durationInFrames={project.durationInFrames}
      fps={project.fps}
      width={project.width}
      height={project.height}
      defaultProps={{project: normalizedProject}}
    />
  );
};
