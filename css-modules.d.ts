// Lets TypeScript read the components' CSS module imports. Next.js, Vite and
// most bundlers ship this declaration already.
declare module "*.module.css" {
  const classes: { readonly [name: string]: string };
  export default classes;
}
