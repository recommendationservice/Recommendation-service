export class RecoApiError extends Error {
	readonly status: number;
	readonly body: unknown;

	constructor(status: number, message: string, body: unknown) {
		super(message);
		this.name = "RecoApiError";
		this.status = status;
		this.body = body;
	}
}
