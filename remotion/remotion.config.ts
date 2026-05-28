import { Config } from '@remotion/cli/config'

// Social-ready output.
Config.setVideoImageFormat('jpeg')
Config.setCodec('h264')
Config.setPixelFormat('yuv420p') // broad compatibility (IG/TikTok/iOS)
Config.setOverwriteOutput(true)
