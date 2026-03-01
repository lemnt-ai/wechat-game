# 微信小游戏 - 开心消消乐

一个简单的消除类小游戏，已集成微信广告组件。

## 项目结构

```
wechat-game/
├── game.js              # 游戏主逻辑
├── game.json            # 游戏配置
├── project.config.json  # 项目配置
├── js/
│   ├── main.js          # 入口文件
│   ├── game.js          # 游戏逻辑
│   └── ad.js            # 广告管理
├── images/              # 游戏图片资源
└── README.md            # 说明文档
```

## 快速开始

### 1. 注册微信小程序

1. 访问 https://mp.weixin.qq.com/
2. 注册小程序账号（选择"小游戏"类别）
3. 获取 AppID

### 2. 配置项目

编辑 `project.config.json`，将 `appid` 替换为你的小程序 AppID：

```json
{
  "appid": "你的 AppID 在这里"
}
```

### 3. 下载微信开发者工具

https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

### 4. 导入项目

1. 打开微信开发者工具
2. 导入项目，选择本文件夹
3. 编译运行

## 广告类型说明

本游戏集成了以下微信广告类型：

| 广告类型 | 说明 | 使用场景 |
|----------|------|----------|
| 激励视频广告 | 用户主动观看，可获得奖励 | 复活、双倍金币、额外步数 |
| 插屏广告 | 全屏广告，自动展示 | 游戏结束、关卡切换 |
| Banner 广告 | 底部横幅广告 | 游戏主界面底部 |
| 格子广告 | 小格子形式 | 界面空白处 |

## 广告收益

- 激励视频广告：收益最高（用户主动观看）
- 插屏广告：收益中等
- Banner/格子广告：收益较低但稳定

## 注意事项

1. **广告审核**：首次接入广告需要微信审核
2. **广告展示频率**：避免过度展示，否则可能被限制
3. **用户隐私**：需配置隐私政策
4. **主体要求**：个人主体小游戏广告功能受限，建议用企业主体

## 开发文档

- 微信小游戏文档：https://developers.weixin.qq.com/minigame/dev/
- 广告组件文档：https://developers.weixin.qq.com/minigame/dev/guide/basis/ad.html
