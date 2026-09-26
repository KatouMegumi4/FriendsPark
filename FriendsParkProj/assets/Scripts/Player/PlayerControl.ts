import {
    _decorator,
    Component,
    Vec3,
    input,
    Input,
    EventKeyboard,
    KeyCode,
    Animation,
    CharacterController,
} from 'cc';
import { PlayerAnimState } from '../GameEnum';
import { GameConfig } from '../GameConfig';

const { ccclass, property } = _decorator;

/**
 * PlayerControl —— 玩家移动 + 跳跃 + 动画状态机（第一阶段·第一人称）
 *
 * 挂载位置：GamePlayer 根节点
 * 依赖组件（在编辑器手动添加到同一节点）：
 *   - cc.CapsuleCharacterController (运动学角色控制器, 自带胶囊碰撞体)
 * 暴露引用（编辑器拖拽）：
 *   - animator    : 角色模型上的 Animation 组件（FBX 子节点 character-a 上的组件）
 *
 * 运行参数（速度/重力等）从 GameConfig 读取，不暴露到引擎面板
 *
 * 第一人称模式下的关键设计：
 *   - 玩家身体 yaw 由 FirstPersonCamera 写入（鼠标左右转头时身体跟着转）
 *   - 本脚本只读取 node.forward / node.right 计算移动方向（即相机水平朝向）
 *   - W=前进 / S=后退 / A=左平移 / D=右平移（不再朝运动方向转身，便于侧移）
 *   - 身体始终保持直立，不上下点头
 *
 * 输入：
 *   W/A/S/D  相机相对移动
 *   Shift    冲刺
 *   Space    跳跃
 */
@ccclass('PlayerControl')
export class PlayerControl extends Component {
    @property({ type: CharacterController, tooltip: '同节点上的 CharacterController 组件' })
    controller: CharacterController | null = null;

    @property({ type: Animation, tooltip: '角色模型上的 Animation 组件' })
    animator: Animation | null = null;

    private _keys: Set<number> = new Set();
    private _velocityY: number = 0;
    private _isGrounded: boolean = true;
    private _state: PlayerAnimState = PlayerAnimState.Idle;

    private _forward: Vec3 = new Vec3(0, 0, -1);
    private _right: Vec3 = new Vec3(1, 0, 0);
    private _moveDir: Vec3 = new Vec3();

    onLoad() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    start() {
        if (!this.controller) {
            console.error('[PlayerControl] 未绑定 CharacterController，请在编辑器拖入');
        }
        if (!this.animator) {
            console.error('[PlayerControl] 未绑定 Animation，请在编辑器拖入');
        }
        // 默认播放 idle
        this.playAnim('idle', false);
    }

    update(dt: number) {
        if (!this.controller) return;
        this.handleMovement(dt);
    }

    private onKeyDown(e: EventKeyboard) {
        this._keys.add(e.keyCode);
    }

    private onKeyUp(e: EventKeyboard) {
        this._keys.delete(e.keyCode);
    }

    private handleMovement(dt: number) {
        const keys = this._keys;
        const moveF = (keys.has(KeyCode.KEY_W) ? 1 : 0) - (keys.has(KeyCode.KEY_S) ? 1 : 0);
        const moveR = (keys.has(KeyCode.KEY_D) ? 1 : 0) - (keys.has(KeyCode.KEY_A) ? 1 : 0);
        const sprint = keys.has(KeyCode.SHIFT_LEFT) || keys.has(KeyCode.SHIFT_RIGHT);
        const jump = keys.has(KeyCode.SPACE);

        const cfg = GameConfig.player;

        // 第一人称：移动方向用玩家自身 forward / right（yaw 已由 FirstPersonCamera 写入）
        const f = this.node.forward;
        this._forward.set(f.x, 0, f.z);
        Vec3.normalize(this._forward, this._forward);
        const r = this.node.right;
        this._right.set(r.x, 0, r.z);
        Vec3.normalize(this._right, this._right);

        // 组合方向
        this._moveDir.set(0, 0, 0);
        Vec3.scaleAndAdd(this._moveDir, this._moveDir, this._forward, moveF);
        Vec3.scaleAndAdd(this._moveDir, this._moveDir, this._right, moveR);
        const hasInput = this._moveDir.lengthSqr() > 0.0001;
        if (hasInput) {
            Vec3.normalize(this._moveDir, this._moveDir);
        }

        // 重力 & 跳跃
        if (this._isGrounded) {
            this._velocityY = 0;
            if (jump) {
                this._velocityY = Math.sqrt(2 * cfg.jumpHeight * Math.abs(cfg.gravity));
                this._isGrounded = false;
            }
        } else {
            this._velocityY += cfg.gravity * dt;
        }

        // 水平速度
        const speed = sprint ? cfg.sprintSpeed : cfg.walkSpeed;
        const dx = this._moveDir.x * speed * dt;
        const dy = this._velocityY * dt;
        const dz = this._moveDir.z * speed * dt;

        // CharacterController.move
        this.controller.move(new Vec3(dx, dy, dz));
        this._isGrounded = this.controller.isGrounded;

        // 动画状态机
        this.updateAnimState(hasInput, sprint);
    }

    private updateAnimState(hasInput: boolean, sprint: boolean) {
        // 空中：保持当前动画（FBX 暂无 jump 切片，TODO 后续接入后切换到 PlayerAnimState.Air）
        if (!this._isGrounded) return;

        let target: PlayerAnimState;
        if (!hasInput) {
            target = PlayerAnimState.Idle;
        } else if (sprint) {
            target = PlayerAnimState.Sprint;
        } else {
            target = PlayerAnimState.Walk;
        }
        if (target !== this._state) {
            this._state = target;
            switch (target) {
                case PlayerAnimState.Idle:
                    this.playAnim('idle', true);
                    break;
                case PlayerAnimState.Walk:
                    this.playAnim('walk', true);
                    break;
                case PlayerAnimState.Sprint:
                    this.playAnim('sprint', true);
                    break;
            }
        }
    }

    private playAnim(name: string, crossFade: boolean) {
        if (!this.animator) return;
        if (crossFade) {
            this.animator.crossFade(name, GameConfig.player.crossFadeDuration);
        } else {
            this.animator.play(name);
        }
    }
}
