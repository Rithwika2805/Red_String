export interface Migration {
  fromVersion: number;
  toVersion: number;
  migrate(save: any): any;
}
