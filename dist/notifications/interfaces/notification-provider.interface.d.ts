export interface INotificationProvider {
    send(to: string, subject: string, template: string, context: Record<string, unknown>): Promise<void>;
}
