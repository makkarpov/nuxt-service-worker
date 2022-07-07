declare module '#service-worker' {
  export interface ServiceWorkerDescriptor {
    url: string;
  }

  declare const descriptor: ServiceWorkerDescriptor;
  export default descriptor;
}
