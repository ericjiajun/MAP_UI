/**
 * 命令接口 - 所有可撤销操作的基类
 * 类似于 C++ 的 IOperation 接口
 */
class ICommand {
    /**
     * 执行命令 (类似 C++ 的 perform)
     * 会有副作用,但 undo 会使副作用消除
     */
    execute() {
        throw new Error('execute() must be implemented by subclass');
    }

    /**
     * 撤销命令
     */
    undo() {
        throw new Error('undo() must be implemented by subclass');
    }

    /**
     * 获取命令名称
     * @returns {string} 命令名称,如果没有名字返回 "(unnamed)"
     */
    getName() {
        return '(unnamed)';
    }
}

export default ICommand;
