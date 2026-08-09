export default interface CIAdapter {

    getInput(key: string, defaultValue?: string|undefined) : string,

    info(message: string) : void,

    warn(message: string) : void,

    error(message: string) : void,

    setOutput?(key: string, output: any)
}
