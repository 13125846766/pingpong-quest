# 第三方与素材说明

**中文** | [English](THIRD_PARTY_NOTICES.en.md)

原创实现和项目自制内容沿用根目录MIT许可。击球录音保留CC0授权，第三方依赖保留自身许可。

- TypeScript：Apache-2.0。Vite、Vitest、esbuild、@types/node：MIT。版本见package-lock.json，许可副本见docs/licenses。node_modules不进入源码包。
- 输入平滑独立实现1€ Filter思想，参考Casiez等人的算法、dli7319/one-euro-filter-js（BSD-3-Clause）和casiez/OneEuroFilterArduino。没有捆绑参考库，见docs/OPEN_SOURCE_REVIEW.md。
- 城市图、五级球拍和图标由imagegen生成。没有复制其他游戏图片；文件和提示词见docs/ASSET_MANIFEST.md。生成插画不是实拍，也不代表现实品牌授权。
- 击球使用 michorvath 的 [Ping pong ball hit](https://freesound.org/people/michorvath/sounds/269718/)，落台使用 el_boss 的 [Ping Pong - Ball on Table](https://freesound.org/people/el_boss/sounds/628637/)。两份录音为CC0，项目内裁剪的WAV沿用CC0，不属于MIT素材授权；来源与处理见 assets/audio/manifest.json，许可见 assets/audio/LICENSE.md。背景乐、触网和界面音效通过Web Audio生成。
- 开发使用humanizer-chinese编辑技能（MIT，版本1d6c08e10fbfe0e1b36ac784834451c6aae0a92c）。技能不进入运行包，许可副本见docs/licenses/humanizer-chinese-MIT.txt。

开发使用AI辅助。文字经过改写，来源记录保留。平台专用SDK、广告标识和配置已从网页版移除。
