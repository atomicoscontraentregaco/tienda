import log from "loglevel";

export type LoadType<R> = Awaited<ReturnType<R>>

class Loader<T> {
    private modules?: T;

    constructor(
        private readonly name: string,
        private readonly initializer: () => Promise<T>,
    ) {}

    public get = async (): Promise<T> => {
        if (this.modules === undefined) {
            log.info(`Loading ${this.name}`);
            this.modules = await this.initializer();
        }

        return this.modules;
    };
}

export default Loader;
