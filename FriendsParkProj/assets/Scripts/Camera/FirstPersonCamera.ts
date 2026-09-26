import {
    _decorator,
    Component,
    Node,
    Vec3,
    math,
    input,
    Input,
    EventMouse,
    EventKeyboard,
    KeyCode,
    game,
} from 'cc';
import { GameConfig } from '../GameConfig';

const { ccclass, property } = _decorator;

/**
 * FirstPersonCamera —— 第一人称相机（第一阶段）
 *
 * 挂载位置：Main Camera（场景根下，不需要作为玩家的子节点）
 * 暴露引用（编辑器拖拽）：
 *   - target : 跟随的玩家节点（GamePlayer 根节点）
 *
 * 运行参数从 GameConfig.camera 读取，不暴露到引擎面板
 *
 * 控制（FPS 标准手感）：
 *   - 进游戏自动隐藏鼠标，鼠标移动直接控制视角（无需按键）
 *   - 按 ESC：显示鼠标、相机控制失效（鼠标不再转视角）
 *   - 再按 ESC：隐藏鼠标、恢复控制
 *
 * 实现要点：
 *   - yaw 写入玩家节点（让玩家身体跟着转），PlayerControl 读 node.forward 计算移动
 *   - pitch 只写入相机本身，身体保持直立
 *   - 相机每帧跟随玩家头部位置（eyeHeight + forwardOffset）
 *   - forwardOffset 沿玩家前方前移一点点，避免相机贴在头部 mesh 内部
 */
@ccclass('FirstPersonCamera')
export class FirstPersonCamera extends Component {
    @property({ type: Node, tooltip: '跟随目标（玩家节点）' })
    target: Node | null = null;

    private _yaw: number = 0;
    private _pitch: number = 0;
    private _active: boolean = true;   // true=控制中（鼠标隐藏），false=已暂停（鼠标显示）

    private _desiredPos: Vec3 = new Vec3();
    private _tmpEuler: Vec3 = new Vec3();

    onLoad() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);

        const cfg = GameConfig.camera;
        this._yaw = cfg.initialYaw;
        this._pitch = cfg.initialPitch;

        // 进游戏自动隐藏鼠标
        this.setCursorVisible(false);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        // 组件销毁时恢复鼠标，免得编辑器卡死
        this.setCursorVisible(true);
    }

    private setCursorVisible(visible: boolean) {
        const cursor = visible ? 'default' : 'none';
        const canvas = game.canvas;
        if (canvas) {
            canvas.style.cursor = cursor;
        }
        if (typeof document !== 'undefined' && document.body) {
            document.body.style.cursor = cursor;
        }
    }

    private onKeyDown(e: EventKeyboard) {
        if (e.keyCode !== KeyCode.ESCAPE) return;
        this._active = !this._active;
        this.setCursorVisible(!this._active);
    }

    private onMouseMove(e: EventMouse) {
        if (!this._active) return;
        const cfg = GameConfig.camera;
        const dx = e.getDeltaX();
        const dy = e.getDeltaY();
        // dx>0（右移）→ yaw 减小 → 身体右转（Cocos 正向 yaw 让 forward 指向 -X 即左侧）
        this._yaw -= dx * cfg.sensitivity;
        // 非反转：鼠标上移(dy<0)→pitch减小→往下看；鼠标下移(dy>0)→pitch增大→往上看
        // 如感觉反向，把下面这行的符号反一下
        this._pitch += dy * cfg.sensitivity;
        this._pitch = math.clamp(this._pitch, cfg.minPitch, cfg.maxPitch);
    }

    update(dt: number) {
        if (!this.target) return;
        const cfg = GameConfig.camera;

        // 1) 玩家身体 yaw（鼠标左右控制身体转向，PlayerControl 据此算移动方向）
        //    即使 _active=false 也继续写入，保持当前朝向不丢
        this._tmpEuler.set(0, this._yaw, 0);
        this.target.eulerAngles = this._tmpEuler;

        // 2) 相机位置 = 玩家脚底 + (0, eyeHeight, 0) + 沿玩家前方的 forwardOffset
        const tp = this.target.worldPosition;
        const forward = this.target.forward; // 已包含 yaw 旋转的世界 forward
        this._desiredPos.set(
            tp.x + forward.x * cfg.forwardOffset,
            tp.y + cfg.eyeHeight,
            tp.z + forward.z * cfg.forwardOffset,
        );
        this.node.setPosition(this._desiredPos);

        // 3) 相机旋转 = pitch + yaw（身体保持直立，相机可上下看）
        this._tmpEuler.set(this._pitch, this._yaw, 0);
        this.node.eulerAngles = this._tmpEuler;
    }
}
