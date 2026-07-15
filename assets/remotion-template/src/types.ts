export type EnterFrom = 'left' | 'right' | 'up' | 'down' | 'scale';
export type LayerRole = 'primary' | 'secondary' | 'tertiary' | 'foreground';
export type CaptionStyle = 'strip' | 'card' | 'minimal';
export type TransitionStyle = 'fade' | 'paper-wipe' | 'cut';
export type StylePreset = 'paper-cut';
export type ContentMode = 'explainer' | 'book';
export type ContentModeInput = ContentMode | 'book-review';
export type AssetStrategy = 'layered';

export type MotionKeyframe = {
  at: number;
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  opacity?: number;
};

export type LayerMotion = {
  action?: string;
  keyframes?: MotionKeyframe[];
  loop?: 'none' | 'bob' | 'sway' | 'pulse';
};

export type IllustrationLayer = {
  id: string;
  assetId?: string;
  src: string;
  role: LayerRole;
  x: number;
  y: number;
  width: number;
  height?: number;
  delay?: number;
  zIndex?: number;
  enterFrom?: EnterFrom;
  rotation?: number;
  scale?: number;
  opacity?: number;
  flipX?: boolean;
  bob?: number;
  label?: string;
  shadow?: 'strong' | 'soft' | 'none';
  sfx?: string;
  sfxVolume?: number;
  motion?: LayerMotion;
};

export type Camera = {
  scaleFrom?: number;
  scaleTo?: number;
  xFrom?: number;
  xTo?: number;
  yFrom?: number;
  yTo?: number;
};

export type Scene = {
  id: string;
  storyBeatId?: string;
  layerPlanRationale?: string;
  from: number;
  duration: number;
  hero?: boolean;
  background: string;
  title?: string;
  eyebrow?: string;
  caption?: string;
  captionStyle?: CaptionStyle;
  note?: string;
  tint?: string;
  camera?: Camera;
  transition?: TransitionStyle;
  transitionSfx?: string;
  transitionSfxVolume?: number;
  decorations?: boolean;
  titleX?: number;
  titleY?: number;
  titleWidth?: number;
  titleSize?: number;
  titleAlign?: 'left' | 'center' | 'right';
  backgroundPosition?: string;
  showBookMeta?: boolean;
  layers: IllustrationLayer[];
};

export type CaptionCue = {
  id: string;
  from: number;
  duration: number;
  text: string;
  style?: CaptionStyle;
};

export type BookInfo = {
  title: string;
  originalTitle?: string;
  author: string;
  angle: string;
  spoilerLevel?: 'none' | 'low' | 'full';
  label?: string;
};

export type Project = {
  title: string;
  contentMode?: ContentModeInput;
  assetStrategy?: AssetStrategy;
  stylePreset?: StylePreset;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  captionSafeBottom?: number;
  palette: {
    paper: string;
    ink: string;
    accent: string;
    gold: string;
  };
  brand?: {
    handle?: string;
    logo?: string | null;
    show?: boolean;
    placement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    logoWidth?: number;
    opacity?: number;
  };
  audio: {
    voice?: string | null;
    music?: string | null;
    musicVolume?: number;
    tailSeconds?: number;
    intentionalSilence?: boolean;
  };
  book?: BookInfo;
  captions?: CaptionCue[];
  scenes: Scene[];
};
