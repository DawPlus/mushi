
    export type RemoteKeys = 'mushi_monitor/Feature';
    type PackageType<T> = T extends 'mushi_monitor/Feature' ? typeof import('mushi_monitor/Feature') :any;