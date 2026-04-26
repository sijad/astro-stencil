import { defineMiddleware } from "astro/middleware";

export const onRequest = defineMiddleware((context, next) => {
  context.props.data = () => {
    return { a: "cvsdfasdkfj" };
  };

  console.log("aaaaaaaaaaaaaaa");
  return next();
});
