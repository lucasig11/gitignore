export default interface ITemplateProvider {
  fetchTemplate(templateName: string): Promise<string[]>;
  listTemplates(): Promise<string>;
}
