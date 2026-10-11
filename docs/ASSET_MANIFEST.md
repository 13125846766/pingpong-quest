# 美术和音频文件

## 城市场景

18张城市图用于地图和比赛背景。前三张沿用已有设计，另外15张单独生成，提示词见 [城市场景提示词](CITY_IMAGE_PROMPTS_V6.md)。生成工具为内置 image_gen，运行文件合计2,252,981字节。原图副本保存在工作目录 `work/city-originals`，游戏加载项目内JPEG，不依赖个人生成目录。

| 城市编号 | 运行文件 | 来源和规格 |
| --- | --- | --- |
| shanghai | assets/cities/shanghai-v6.jpg | 内置 image_gen；640×960 JPEG |
| tokyo | assets/cities/tokyo-v6.jpg | 内置 image_gen；640×960 JPEG |
| paris | assets/cities/paris-v6.jpg | 内置 image_gen；640×960 JPEG |
| beijing | assets/cities/beijing-v6.jpg | 内置 image_gen；640×960 JPEG |
| chengdu | assets/cities/chengdu-v6.jpg | 内置 image_gen；640×960 JPEG |
| hongkong | assets/cities/hongkong-v6.jpg | 内置 image_gen；640×960 JPEG |
| seoul | assets/cities/seoul-v6.jpg | 内置 image_gen；640×960 JPEG |
| bangkok | assets/cities/bangkok-v6.jpg | 内置 image_gen；640×960 JPEG |
| singapore | assets/cities/singapore-v6.jpg | 内置 image_gen；640×960 JPEG |
| sydney | assets/cities/sydney-v6.jpg | 内置 image_gen；640×960 JPEG |
| dubai | assets/cities/dubai-v6.jpg | 内置 image_gen；640×960 JPEG |
| rome | assets/cities/rome-v6.jpg | 内置 image_gen；640×960 JPEG |
| barcelona | assets/cities/barcelona-v6.jpg | 内置 image_gen；640×960 JPEG |
| london | assets/cities/london-v6.jpg | 内置 image_gen；640×960 JPEG |
| berlin | assets/cities/berlin-v6.jpg | 内置 image_gen；640×960 JPEG |
| capetown | assets/cities/capetown-v6.jpg | 内置 image_gen；640×960 JPEG |
| rio | assets/cities/rio-v6.jpg | 内置 image_gen；640×960 JPEG |
| newyork | assets/cities/newyork-v6.jpg | 内置 image_gen；640×960 JPEG |

## 球拍、图标和声音

| 文件 | 用途和来源 |
| --- | --- |
| assets/rackets/level-1.png 至 level-5.png | 五个等级独立生成；192×288 RGBA，保留透明背景。提示词见 RACKET_IMAGE_PROMPTS.md |
| assets/rackets/manifest.json | 原始输出、归一化尺寸和拍面锚点 |
| assets/branding/icon-600.png | 项目图标；内置 image_gen，600×600完整方形PNG，无水印和二维码 |
| src/rendering、src/ui | 球台、球网、球、界面和图片加载期间的几何绘制 |
| assets/audio/racket-hit.wav | michorvath · Ping pong ball hit；CC0；44.1kHz单声道实录裁剪 |
| assets/audio/table-bounce-1.wav 至 table-bounce-3.wav | el_boss · Ping Pong - Ball on Table；CC0；三次不同落台实录裁剪 |
| assets/audio/manifest.json、LICENSE.md | 录音来源、下载链接、裁剪时间、处理步骤、文件校验值与许可 |
| src/audio/browser-audio.ts | 录音播放、触网与界面音效、远近和强弱混音、后台暂停 |
| src/audio/music.ts | 原创16小节器乐背景；Web Audio合成，无第三方音乐 |

城市图不是实拍，球拍没有采用其他游戏的图片。运行不依赖原始生成目录。手机图片内存仍待实机测试。
