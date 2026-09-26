/**
 * GameEnum —— 游戏内共享枚举
 *
 * 纯 TypeScript 模块，不挂载到引擎：
 *   - 无 @ccclass 装饰器，不会出现在编辑器「添加组件」菜单里
 *   - 其它脚本通过 import 使用
 */

/** 玩家动画状态 */
export enum PlayerAnimState {
    Idle,
    Walk,
    Sprint,
    Air,
}
