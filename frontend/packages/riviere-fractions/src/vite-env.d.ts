// Modules CSS : le bundler de l'application hôte (Vite dans Yamba Academy) les transforme en objets de classes.
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
