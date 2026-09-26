/**
 * GameConfig —— 游戏内共享配置
 *
 * 纯 TypeScript 模块，不挂载到引擎：
 *   - 无 @ccclass 装饰器，不会出现在编辑器「添加组件」菜单里
 *   - 改参数直接编辑本文件，无需在编辑器面板里调
 */

export const GameConfig = {
    player: {
        walkSpeed: 5,             // 行走速度 m/s
        sprintSpeed: 8,           // 冲刺速度 m/s
        jumpHeight: 2,            // 跳跃高度 m
        gravity: -20,             // 重力加速度 m/s^2 (负值)
        crossFadeDuration: 0.15,  // 动画淡入淡出时长 s
    },
    camera: {
        eyeHeight: 2.3,           // 相机相对玩家脚底的高度（眼睛位置）
        forwardOffset: 0.15,      // 相机沿玩家前方前移量（避免贴在头部 mesh 内部）
        sensitivity: 0.15,        // 鼠标灵敏度（FPS 通常比第三人称低一点）
        maxPitch: 80,             // 仰角上限（度）
        minPitch: -80,            // 俯角下限（度，负=朝下看）
        initialYaw: 0,            // 初始 yaw（度）
        initialPitch: 0,          // 初始 pitch（度）
    },
};
