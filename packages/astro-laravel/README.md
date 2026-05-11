# astro-laravel

**Astro adapter for Laravel**

`astro-laravel` lets you build Laravel Blade templates with [Astro](https://astro.build/).
Write `.blade.php.astro` files inside your Astro project and compile them directly into your Laravel application's `resources/views` directory.

With astro-laravel, you can build Laravel views using Astro's JSX-style component syntax while still rendering standard Blade templates.

Unlike solutions such as Inertia.js, the final application does not require a persistent Node.js runtime in production.

## How It Works

During development:

* Astro handles views compilation and HMR
* Requests are proxied through Astro for seamless development experience

When building for production:

* `.blade.php.astro` files are compiled into Blade templates
* Static assets are emitted into Laravel's `public/` directory
* No Node.js runtime is required in production

Laravel continues to handle:

* Routing
* Controllers
* Middleware
* Authentication
* Server-side rendering

## Installation

### Prerequisites

- A working local laravel app (e.g., running at `http://localhost:8001`)

### Steps

1. Create a new Astro project

   ```bash
   npm create astro@latest
   ```

2. Add the astro-laravel adapter

   ```bash
   npx astro add astro-laravel
   ```

3. Update your `astro.config.mjs`

   ```js
   // @ts-check
   import { defineConfig, passthroughImageService } from "astro/config";
   import laravel from "astro-laravel";

   // https://astro.build/config
   export default defineConfig({
     server: {
       host: "127.0.0.1",
     },
     adapter: laravel({
       installationDir: "../laravel-path/", // Laravel installation path
       devProxyTarget: "http://localhost:8001", // Your local laravel server URL

       // Optional
       viewsDirPath: "./resources/views/astro/",
       publicDirPath: "./public/",
     }),
     image: {
       service: passthroughImageService(),
     },
   });
   ```

4. Create a layout (e.g., `src/layouts/Layout.astro`)

   ```astro
   <!doctype html>
   <html>
     <head>
       <meta charset="UTF-8" />
       <meta http-equiv="x-ua-compatible" content="ie=edge" />
       <meta name="viewport" content="width=device-width, initial-scale=1" />
     </head>
     <body>
       <main>
         <slot />
       </main>
     </body>
   </html>
   ```

5. Add a template view (e.g., `src/pages/welcome.blade.php.astro`)

   ```astro
   ---
   import Layout from "../layouts/Layout.astro";
   ---

   <Layout>
     <h1>
       Hello {'{{ $name }}'}
     </h1>
   </Layout>
   ```

6. Start the dev server

   ```bash
   npm run dev
   ```

7. Use `welcome.blade.php` like any standard Laravel view:

  ```php
    <?php

    use Illuminate\Support\Facades\Route;

    Route::get('/', function () {
        return view('astro/welcome', ['name' => 'User Name']);
    });

  ```

## Configuration Options

| Option            | Description                                                                     | Default                                    |
|-------------------|---------------------------------------------------------------------------------|--------------------------------------------|
| `installationDir` | Path to your Laravel application                                                | Required                                   |
| `devProxyTarget`  | Local Laravel server URL                                                        | Required                                   |
| `viewsDirPath`    | Directory where compiled Blade templates are written and replaced during builds | `{installationDir}/resources/views/astro/` |
| `publicDirPath`   | Output directory for generated assets                                           | `{installationDir}/public/`                |


## Build for Production

Generate production-ready Blade views and assets:

```bash
npm run build
```

Generated output:

* Blade views → `resources/views/astro/`
* Static assets → `public/`

Both directories can be customized using `viewsDirPath` and `publicDirPath`.

## View Directory

By default, compiled Blade templates are generated into `resources/views/astro/`, The `/astro` suffix is intentional.

During builds, the adapter replaces the contents of the configured `viewsDirPath` directory with freshly compiled views. Using a dedicated subdirectory helps avoid accidentally overwriting existing Laravel Blade templates.

If you change `viewsDirPath`, it is recommended to use a dedicated directory exclusively managed by `astro-laravel`.

## Public Assets

Astro's local `public/` directory is ignored by this adapter.

To serve static assets such as images, fonts, or downloadable files, place them inside your Laravel application's `public/` directory instead.

Example:

```text
laravel/
└── public/
    ├── images/
    ├── fonts/
    └── favicon.ico
```

Then reference them normally inside your Astro templates:

```astro
<img src="/images/logo.png" alt="Logo" />
```

This ensures assets are served correctly by Laravel in both development and production environments.

## Example Project Structure

```text
my-project/
├── astro/
│   ├── src/
│   │   ├── layouts/
│   │   │   └── Layout.astro
│   │   └── pages/
│   │       └── welcome.blade.php.astro
│   └── astro.config.mjs
│
└── laravel/
    ├── resources/
    │   └── views/
    └── public/
```

---

## Dynamic Blade Components with Astro Stencil

For type-safe dynamic Blade rendering, you can combine this adapter with [astro-stencil](https://github.com/sijad/astro-stencil/tree/main/packages/astro-stencil).

`astro-stencil` allows you to define strongly typed template inputs and safely render dynamic Laravel data inside Astro components.
