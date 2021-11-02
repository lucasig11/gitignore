export default class CliError {
  constructor(
    public readonly message: string,
    public readonly exitCode?: number,
  ) {
    this.message = message;
    this.exitCode = exitCode || 1;
  }
}
