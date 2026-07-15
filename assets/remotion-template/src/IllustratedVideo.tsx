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
import type {CaptionCue, CaptionStyle, IllustrationLayer, Project, Scene} from './types';

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

const Layer: React.FC<{layer: IllustrationLayer; sceneDuration: number}> = ({layer, sceneDuration}) => {
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
  const keyframes = layer.motion?.keyframes ?? [];
  const sceneProgress = Math.max(0, Math.min(1, frame / Math.max(1, sceneDuration - 1)));
  const keyframed = (field: 'x' | 'y' | 'rotation' | 'scale' | 'opacity', fallback: number) => keyframes.length >= 2
    ? interpolate(
        sceneProgress,
        keyframes.map((keyframe) => keyframe.at),
        keyframes.map((keyframe) => keyframe[field] ?? fallback),
        clamp,
      )
    : fallback;
  const legacyMotion = layer.motion == null;
  const loop = layer.motion?.loop ?? (legacyMotion ? 'bob' : 'none');
  const bob = loop === 'bob' ? (layer.bob ?? motion.drift) * Math.sin((frame + delay * 1.7) / 17) : 0;
  const parallax = legacyMotion
    ? layer.role === 'foreground' ? Math.sin(frame / 24) * 11 : Math.sin(frame / 43) * motion.drift * 0.35
    : 0;
  const sway = loop === 'sway' ? Math.sin((frame + delay) / 19) * 2.4 : 0;
  const pulse = loop === 'pulse' ? 1 + Math.sin((frame + delay) / 16) * 0.025 : 1;
  const x = layer.x + interpolate(progress, [0, 1], [xOffset, 0], clamp) + parallax + keyframed('x', 0);
  const y = layer.y + interpolate(progress, [0, 1], [yOffset, 0], clamp) + bob + keyframed('y', 0);
  const scale = (layer.scale ?? 1) * entranceScale * keyframed('scale', 1) * pulse;
  const entranceOpacity = interpolate(progress, [0, 0.14, 1], [0, 1, 1], clamp);
  const opacity = entranceOpacity * keyframed('opacity', layer.opacity ?? 1);
  const settleRotation = (1 - progress) * (direction === 'left' ? -7 : direction === 'right' ? 7 : 0);
  const semanticRotation = keyframed('rotation', 0);

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
        transform: `rotate(${(layer.rotation ?? 0) + settleRotation + semanticRotation + sway}deg) scaleX(${layer.flipX ? -scale : scale}) scaleY(${scale})`,
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

const Caption: React.FC<{text: string; styleName: CaptionStyle; project: Project; zIndex?: number}> = ({text, styleName, project, zIndex = 45}) => {
  const safeBottom = project.captionSafeBottom ?? (project.contentMode === 'book' ? Math.round(project.height * 0.095) : null);
  if (styleName === 'card') {
    return (
      <div
        style={{
          position: 'absolute', zIndex, left: 70, right: 70, bottom: safeBottom ?? 88, color: '#FFF9E9',
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
          position: 'absolute', zIndex, left: 80, right: 80, bottom: safeBottom ?? 76, color: '#FFFDF4',
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
        position: 'absolute', zIndex, left: 0, right: 0, bottom: safeBottom ?? 62, color: '#FFFDF4',
        padding: '16px 72px 19px', background: 'linear-gradient(90deg, transparent 0%, rgba(20,19,16,.72) 12%, rgba(20,19,16,.72) 88%, transparent 100%)',
        fontSize: 40, lineHeight: 1.34, fontWeight: 850, textAlign: 'center',
        textShadow: '0 3px 2px #171713, 2px 0 1px #171713, -2px 0 1px #171713',
      }}
    >
      {text}
    </div>
  );
};

const BookMeta: React.FC<{project: Project}> = ({project}) => {
  const book = project.book;
  if (!book) return null;
  return (
    <div
      style={{
        position: 'absolute', zIndex: 38, left: 68, right: 68, top: 105,
        color: project.palette.ink, transform: 'rotate(-0.35deg)',
      }}
    >
      <div
        style={{
          display: 'inline-flex', color: project.palette.paper, background: project.palette.accent,
          padding: '9px 20px 11px', border: `2px solid ${project.palette.paper}`,
          boxShadow: `5px 6px 0 ${project.palette.ink}`, fontSize: 27, fontWeight: 900,
          letterSpacing: 5,
        }}
      >
        {book.label ?? 'ILLUSTRATED BOOK'}
      </div>
      <div
        style={{
          marginTop: 22, maxWidth: 900, color: project.palette.ink, fontSize: 83,
          lineHeight: 1.05, fontWeight: 950, letterSpacing: -4, whiteSpace: 'pre-line',
          textShadow: `4px 4px 0 ${project.palette.paper}, 7px 8px 0 rgba(32,37,30,.16)`,
        }}
      >
        {book.title}
      </div>
      {book.originalTitle ? (
        <div
          style={{
            marginTop: 13, display: 'table', maxWidth: 850, color: project.palette.paper,
            background: 'rgba(11,31,42,.82)', padding: '7px 13px 8px', borderRadius: 4,
            fontSize: 25, lineHeight: 1.25, fontWeight: 650,
          }}
        >
          {book.originalTitle}
        </div>
      ) : null}
      <div
        style={{
          marginTop: 17, display: 'inline-block', color: project.palette.paper,
          background: 'rgba(28,31,26,.86)', padding: '9px 17px 11px',
          borderRadius: 5, fontSize: 29, lineHeight: 1.2, fontWeight: 800,
        }}
      >
        {book.author}
      </div>
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
  const fadeOut = project.contentMode === 'book'
    ? 1
    : interpolate(frame, [Math.max(0, scene.duration - 9), scene.duration], [1, 0], clamp);
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
          style={{
            position: 'absolute', inset: -32, width: 'calc(100% + 64px)', height: 'calc(100% + 64px)',
            objectFit: 'cover', objectPosition: scene.backgroundPosition ?? 'center center',
          }}
        />
      </AbsoluteFill>
      {scene.tint ? <AbsoluteFill style={{background: scene.tint, mixBlendMode: 'multiply', opacity: 0.26}} /> : null}
      {isPaperCut ? <PaperTexture /> : null}
      {(scene.layers ?? []).map((layer) => <Layer key={layer.id} layer={layer} sceneDuration={scene.duration} />)}
      {(scene.layers ?? []).map((layer) => layer.sfx ? (
        <Sequence key={`${layer.id}-sfx`} from={layer.delay ?? 0}>
          <Audio src={staticFile(layer.sfx)} volume={layer.sfxVolume ?? 0.2} />
        </Sequence>
      ) : null)}
      {scene.transitionSfx ? <Audio src={staticFile(scene.transitionSfx)} volume={scene.transitionSfxVolume ?? 0.18} /> : null}
      {isPaperCut ? <CollageDecoration project={project} scene={scene} /> : null}

      {project.contentMode === 'book' && scene.showBookMeta ? <BookMeta project={project} /> : null}

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
          <div
            style={{
              marginTop: 15, display: 'table', color: project.palette.ink,
              background: 'rgba(232,214,175,.88)', padding: '7px 13px 8px', borderRadius: 4,
              boxShadow: '3px 4px 0 rgba(11,31,42,.16)', fontSize: 31, fontWeight: 780, lineHeight: 1.32,
            }}
          >
            {scene.note}
          </div>
        ) : null}
      </div>

      {!project.captions?.length && scene.caption ? (
        <Caption text={scene.caption} styleName={scene.captionStyle ?? 'strip'} project={project} />
      ) : null}
      <TransitionOverlay scene={scene} project={project} />
    </AbsoluteFill>
  );
};

const TimedCaption: React.FC<{cue: CaptionCue; project: Project}> = ({cue, project}) => (
  <Caption text={cue.text} styleName={cue.style ?? 'minimal'} project={project} zIndex={90} />
);

const Brand: React.FC<{project: Project}> = ({project}) => {
  const brand = project.brand;
  const handle = brand?.handle?.trim();
  const logo = brand?.logo?.trim();
  if (!brand?.show || (!handle && !logo)) return null;
  const placement = brand.placement ?? 'top-right';
  const vertical = placement.startsWith('top') ? {top: 74} : {bottom: 46};
  const horizontal = placement.endsWith('right') ? {right: 54} : {left: 54};
  const hasHandle = Boolean(handle);
  return (
    <div
      style={{
        position: 'absolute', zIndex: 100, ...vertical, ...horizontal, display: 'flex', alignItems: 'center', gap: 11,
        color: project.palette.paper, opacity: brand.opacity ?? 0.94,
        background: hasHandle ? 'rgba(27,26,22,.72)' : 'transparent',
        border: hasHandle ? `2px solid ${project.palette.paper}` : 'none',
        padding: hasHandle ? '9px 15px 10px' : 0,
        fontSize: 24, lineHeight: 1, fontWeight: 850, letterSpacing: 1.5, transform: 'rotate(1.2deg)',
        filter: logo && !hasHandle ? 'drop-shadow(0 4px 5px rgba(20,18,14,.3))' : undefined,
      }}
    >
      {logo ? (
        <Img
          src={staticFile(logo)}
          style={{display: 'block', width: brand.logoWidth ?? 96, height: 'auto', objectFit: 'contain'}}
        />
      ) : null}
      {handle ? <span>@{handle.replace(/^@/, '')}</span> : null}
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
    {(project.captions ?? []).map((cue) => (
      <Sequence key={cue.id} from={cue.from} durationInFrames={cue.duration} premountFor={5}>
        <TimedCaption cue={cue} project={project} />
      </Sequence>
    ))}
    <Brand project={project} />
  </AbsoluteFill>
);
