import {Config} from '@remotion/cli/config';

Config.setOverwriteOutput(true);
Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setCrf(18);
