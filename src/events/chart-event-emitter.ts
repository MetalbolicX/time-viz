import type { ChartEventData, ChartEventType } from "@/types";

export class ChartEventEmitter extends EventTarget {
  public emit<T extends ChartEventType>(eventType: T, data: ChartEventData[T]): void {
    const event = new CustomEvent(eventType, {
      detail: { ...data, timestamp: Date.now() }
    });
    this.dispatchEvent(event);
  }

  public on<T extends ChartEventType>(
    eventType: T,
    handler: (event: CustomEvent<ChartEventData[T] & { timestamp: number }>) => void
  ): void {
    this.addEventListener(eventType, handler as EventListener);
  }

  public off<T extends ChartEventType>(
    eventType: T,
    handler: (event: CustomEvent<ChartEventData[T] & { timestamp: number }>) => void
  ): void {
    this.removeEventListener(eventType, handler as EventListener);
  }

  public once<T extends ChartEventType>(
    eventType: T,
    handler: (event: CustomEvent<ChartEventData[T] & { timestamp: number }>) => void
  ): void {
    const wrappedHandler = (event: Event) => {
      handler(event as CustomEvent<ChartEventData[T] & { timestamp: number }>);
      this.removeEventListener(eventType, wrappedHandler);
    };
    this.addEventListener(eventType, wrappedHandler);
  }
}
