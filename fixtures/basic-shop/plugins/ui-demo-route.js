export default function uiDemoRoutePlugin() {
  return {
    name: "ui-demo-route",

    data(data) {
      return {
        ...data,
        contents: [
          ...data.contents,
          {
            id: "page-ui-storefront-demo",
            type: "page",
            title: "UI Storefront Demo",
            slug: "ui-storefront-demo",
            domain: "demo",
            data: {
              description: "Trang thử nghiệm giao diện storefront trước khi áp dụng toàn site.",
              headline: "Không gian thử header, footer và layout shop",
              uiDemo: true
            }
          }
        ]
      };
    }
  };
}
