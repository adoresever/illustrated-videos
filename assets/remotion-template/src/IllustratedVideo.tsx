import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {CaptionStyle, IllustrationLayer, Project, Scene} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const roleMotion = {
  primary: {distance: 235, damping: 12, mass: 0.85, drift: 8},
  secondary: {distance: 165, damping: 14, mass: 0.72, drift: 5},
  tertiary: {distance: 105, damping: 17, mass: 0.62, drift: 3},
  foreground: {distance: 285, damping: 11, mass: 0.92, drift: 12},
};

const shadowByRole = {
  primary: 'drop-shadow(0 0 4px rgba(250,244,226,.98)) drop-shadow(0 18px 13px rgba(35,22,14,.38))',
  secondary: 'drop-shadow(0 0 3px rgba(250,244,226,.95)) drop-shadow(0 12px 10px rgba(35,22,14,.30))',
  tertiary: 'drop-shadow(0 0 2px rgba(250,244,226,.88)) drop-shadow(0 8px 7px rgba(35,22,14,.22))',
  foreground: 'drop-shadow(0 0 5px rgba(250,244,226,.96)) drop-shadow(0 22px 17px rgba(35,22,14,.42))',
};

const PaperTexture: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      zIndex: 18,
      opacity: 0.2,
      mixBlendMode: 'multiply',
      backgroundImage:
        'radial-gradient(circle at 15% 24%, rgba(80,55,30,.17) 0 1px, transparent 1.5px), radial-gradient(circle at 74% 68%, rgba(80,55,30,.12) 0 1px, transparent 1.4px)',
      backgroundSize: '19px 23px, 27px 31px',
    }}
  />
);

const CollageDecoration: React.FC<{project: Project; scene: Scene}> = ({project, scene}) => {
  const frame = useCurrentFrame();
  if (scene.decorations === false) return null;
  const sway = Math.sin(frame / 31) * 3;
  return (
    <AbsoluteFill style={{zIndex: 19, pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: -8,
          left: -20,
          right: -20,
          height: 62,
          background: project.palette.accent,
          clipPath: 'polygon(0 0,100% 0,100% 72%,94% 84%,87% 70%,79% 90%,70% 74%,61% 88%,52% 72%,43% 90%,35% 73%,26% 86%,17% 71%,8% 88%,0 74%)',
          opacity: 0.94,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 42,
          top: 320,
          width: 150,
          height: 150,
          opacity: 0.2,
          borderRadius: '50%',
          backgroundImage: `radial-gradient(${project.palette.ink} 0 4px, transparent 4.5px)`,
          backgroundSize: '20px 20px',
          transform: `rotate(8deg) translateY(${sway}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 38,
          bottom: 310,
          width: 88,
          height: 44,
          background: project.palette.gold,
          opacity: 0.62,
          transform: `rotate(-12deg) translateY(${-sway}px)`,
          clipPath: 'polygon(0 14%,88% 0,100% 80%,8% 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

const layerFilter = (layer: IllustrationLayer) => {
  if (layer.shadow === 'none') return 'none';
  if (layer.shadow === 'soft') return shadowByRole.tertiary;
  if (layer.shadow === 'strong') return shadowByRole.foreground;
  return shadowByRole[layer.role];
};

const Layer: React.FC<{layer: IllustrationLayer}> = ({layer}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const motion = roleMotion[layer.role];
  const delay = layer.delay ?? 0;
  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: {damping: motion.damping, mass: motion.mass, stiffness: 118},
    durationInFrames: Math.round(fps * 0.9),
  });
  const direction = layer.enterFrom ?? (layer.role === 'primary' ? 'left' : 'right');
  const xOffset = direction === 'left' ? -motion.distance : direction === 'right' ? motion.distance : 0;
  const yOffset = direction === 'up' ? -motion.distance : direction === 'down' ? motion.distance : 0;
  const entranceScale = direction === 'scale' ? interpolate(progress, [0, 1], [0.48, 1], clamp) : 1;
  const bob = (layer.bob ?? motion.drift) * Math.sin((frame + delay * 1.7) / 17);
  const parallax = layer.role === 'foreground' ? Math.sin(frame / 24) * 11 : Math.sin(frame / 43) * motion.drift * 0.35;
  const x = layer.x + interpolate(progress, [0, 1], [xOffset, 0], clamp) + parallax;
  const y = layer.y + interpolate(progress, [0, 1], [yOffset, 0], clamp) + bob;
  const scale = (layer.scale ?? 1) * entranceScale;
  const opacity = interpolate(progress, [0, 0.14, 1], [0, layer.opacity ?? 1, layer.opacity ?? 1], clamp);
  const settleRotation = (1 - progress) * (direction === 'left' ? -7 : direction === 'right' ? 7 : 0);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        zIndex: layer.zIndex ?? 5,
        width: layer.width,
        height: layer.height,
        opacity,
        transform: `rotate(${(layer.rotation ?? 0) + settleRotation}deg) scaleX(${layer.flipX ? -scale : scale}) scaleY(${scale})`,
        transformOrigin: '50% 80%',
        filter: layerFilter(layer),
      }}
    >
      <Img src={staticFile(layer.src)} style={{display: 'block', width: '100%', height: '100%', objectFit: 'contain'}} />
      {layer.label ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -46,
            transform: 'translateX(-50%) rotate(-1deg)',
            whiteSpace: 'nowrap',
            color: '#FFF8E8',
            background: '#982F2A',
            border: '3px solid #FFF4D8',
            borderRadius: 7,
            padding: '9px 20px 11px',
            fontSize: 28,
            fontWeight: 850,
            letterSpacing: 2,
            boxShadow: '4px 6px 0 rgba(25,22,18,.22)',
          }}
        >
          {layer.label}
        </div>
      ) : null}
    </div>
  );
};

const Caption: React.FC<{text: string; styleName: CaptionStyle; project: Project}> = ({text, styleName, project}) => {
  if (styleName === 'card') {
    return (
      <div
        style={{
          position: 'absolute', zIndex: 45, left: 70, right: 70, bottom: 88, color: '#FFF9E9',
          background: 'rgba(31,35,29,.9)', border: `3px solid ${project.palette.paper}`, borderRadius: 24,
          padding: '20px 30px 23px', fontSize: 40, lineHeight: 1.34, fontWeight: 800, textAlign: 'center',
        }}
      >
        {text}
      </div>
    );
  }
  if (styleName === 'minimal') {
    return (
      <div
        style={{
          position: 'absolute', zIndex: 45, left: 80, right: 80, bottom: 76, color: '#FFFDF4',
          fontSize: 38, lineHeight: 1.34, fontWeight: 850, textAlign: 'center',
          textShadow: '0 3px 2px #171713, 2px 0 1px #171713, -2px 0 1px #171713',
        }}
      >
        {text}
      </div>
    );
  }
  return (
    <div
      style={{
        position: 'absolute', zIndex: 45, left: 0, right: 0, bottom: 62, color: '#FFFDF4',
        padding: '16px 72px 19px', background: 'linear-gradient(90deg, transparent 0%, rgba(20,19,16,.72) 12%, rgba(20,19,16,.72) 88%, transparent 100%)',
        fontSize: 40, lineHeight: 1.34, fontWeight: 850, textAlign: 'center',
        textShadow: '0 3px 2px #171713, 2px 0 1px #171713, -2px 0 1px #171713',
      }}
    >
      {text}
    </div>
  );
};

const TransitionOverlay: React.FC<{scene: Scene; project: Project}> = ({scene, project}) => {
  const frame = useCurrentFrame();
  if (scene.transition !== 'paper-wipe') return null;
  const reveal = interpolate(frame, [0, 15], [0, 100], clamp);
  return (
    <AbsoluteFill style={{zIndex: 80, pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute', inset: 0, background: project.palette.accent,
          clipPath: `polygon(${reveal}% 0,100% 0,100% 100%,${Math.min(100, reveal + 13)}% 100%)`,
        }}
      />
      <div
        style={{
          position: 'absolute', inset: 0, background: project.palette.paper, opacity: 0.9,
          clipPath: `polygon(${Math.max(0, reveal - 8)}% 0,${reveal}% 0,${Math.min(100, reveal + 13)}% 100%,${Math.max(0, reveal + 3)}% 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const SceneCard: React.FC<{scene: Scene; project: Project}> = ({scene, project}) => {
  const frame = useCurrentFrame();
  const camera = scene.camera ?? {};
  const fadeIn = scene.transition === 'cut' || scene.transition === 'paper-wipe' ? 1 : interpolate(frame, [0, 9], [0, 1], clamp);
  const fadeOut = interpolate(frame, [Math.max(0, scene.duration - 9), scene.duration], [1, 0], clamp);
  const sceneOpacity = Math.min(fadeIn, fadeOut);
  const scale = interpolate(frame, [0, scene.duration], [camera.scaleFrom ?? 1.01, camera.scaleTo ?? 1.045], clamp);
  const cameraX = interpolate(frame, [0, scene.duration], [camera.xFrom ?? 0, camera.xTo ?? 0], clamp);
  const cameraY = interpolate(frame, [0, scene.duration], [camera.yFrom ?? 0, camera.yTo ?? 0], clamp);
  const titleProgress = spring({frame: Math.max(0, frame - 4), fps: project.fps, config: {damping: 15, stiffness: 130}});
  const titleY = interpolate(titleProgress, [0, 1], [36, 0], clamp);
  const titleX = scene.titleX ?? 68;
  const titleTop = scene.titleY ?? 96;
  const isPaperCut = (project.stylePreset ?? 'paper-cut') === 'paper-cut';

  return (
    <AbsoluteFill style={{opacity: sceneOpacity, backgroundColor: project.palette.paper, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translate(${cameraX}px, ${cameraY}px) scale(${scale})`}}>
        <Img
          src={staticFile(scene.background)}
          style={{position: 'absolute', inset: -32, width: 'calc(100% + 64px)', height: 'calc(100% + 64px)', objectFit: 'cover'}}
        />
      </AbsoluteFill>
      {scene.tint ? <AbsoluteFill style={{background: scene.tint, mixBlendMode: 'multiply', opacity: 0.26}} /> : null}
      {isPaperCut ? <PaperTexture /> : null}
      {scene.layers.map((layer) => <Layer key={layer.id} layer={layer} />)}
      {scene.layers.map((layer) => layer.sfx ? (
        <Sequence key={`${layer.id}-sfx`} from={layer.delay ?? 0}>
          <Audio src={staticFile(layer.sfx)} volume={layer.sfxVolume ?? 0.2} />
        </Sequence>
      ) : null)}
      {scene.transitionSfx ? <Audio src={staticFile(scene.transitionSfx)} volume={scene.transitionSfxVolume ?? 0.18} /> : null}
      {isPaperCut ? <CollageDecoration project={project} scene={scene} /> : null}

      <div
        style={{
          position: 'absolute', zIndex: 32, left: titleX, top: titleTop, width: scene.titleWidth ?? 870,
          textAlign: scene.titleAlign ?? 'left', transform: `translateY(${titleY}px) rotate(-0.5deg)`,
        }}
      >
        {scene.eyebrow ? (
          <div
            style={{
              display: 'inline-flex', color: project.palette.paper, background: project.palette.accent,
              border: `2px solid ${project.palette.paper}`, padding: '9px 21px 11px', fontSize: 28,
              fontWeight: 900, letterSpacing: 5, boxShadow: `5px 6px 0 ${project.palette.ink}`,
            }}
          >
            {scene.eyebrow}
          </div>
        ) : null}
        {scene.title ? (
          <div
            style={{
              marginTop: 18, color: project.palette.ink, fontSize: scene.titleSize ?? 88, lineHeight: 1.01,
              fontWeight: 950, letterSpacing: -4, whiteSpace: 'pre-line',
              textShadow: `4px 4px 0 ${project.palette.paper}, 7px 8px 0 rgba(32,37,30,.16)`,
            }}
          >
            {scene.title}
          </div>
        ) : null}
        {scene.note ? (
          <div style={{marginTop: 15, color: project.palette.ink, fontSize: 31, fontWeight: 780, lineHeight: 1.32}}>
            {scene.note}
          </div>
        ) : null}
      </div>

      {scene.caption ? <Caption text={scene.caption} styleName={scene.captionStyle ?? 'strip'} project={project} /> : null}
      <TransitionOverlay scene={scene} project={project} />
    </AbsoluteFill>
  );
};

const Brand: React.FC<{project: Project}> = ({project}) => {
  const brand = project.brand;
  if (!brand?.show || !brand.handle) return null;
  const placement = brand.placement ?? 'top-right';
  const vertical = placement.startsWith('top') ? {top: 74} : {bottom: 46};
  const horizontal = placement.endsWith('right') ? {right: 54} : {left: 54};
  return (
    <div
      style={{
        position: 'absolute', zIndex: 100, ...vertical, ...horizontal, color: project.palette.paper,
        background: 'rgba(27,26,22,.72)', border: `2px solid ${project.palette.paper}`, padding: '9px 15px 10px',
        fontSize: 24, lineHeight: 1, fontWeight: 850, letterSpacing: 1.5, transform: 'rotate(1.2deg)',
      }}
    >
      @{brand.handle.replace(/^@/, '')}
    </div>
  );
};

export const IllustratedVideo: React.FC<{project: Project}> = ({project}) => (
  <AbsoluteFill
    style={{
      background: project.palette.paper,
      fontFamily: 'Noto Sans CJK SC, Source Han Sans SC, Noto Serif CJK SC, serif',
    }}
  >
    {project.audio.voice ? <Audio src={staticFile(project.audio.voice)} /> : null}
    {project.audio.music ? <Audio loop volume={project.audio.musicVolume ?? 0.1} src={staticFile(project.audio.music)} /> : null}
    {project.scenes.map((scene) => (
      <Sequence key={scene.id} from={scene.from} durationInFrames={scene.duration} premountFor={30}>
        <SceneCard scene={scene} project={project} />
      </Sequence>
    ))}
    <Brand project={project} />
  </AbsoluteFill>
);
