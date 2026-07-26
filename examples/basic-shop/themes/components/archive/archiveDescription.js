export function renderArchiveDescription(description) {
  return `
    <section class="storefront-archive-description" data-collapsible-description>
      <div class="storefront-archive-description__inner">
        <p class="storefront-kicker">Thông tin danh mục</p>
        <h2>Tìm hiểu thêm trước khi đặt in</h2>
        <div class="storefront-archive-description__content storefront-archive-description__content--preview" data-description-preview>
          ${description}
        </div>
        <div class="storefront-archive-description__content" data-description-full hidden>
          ${description}
        </div>
        <button class="storefront-description-toggle" type="button" data-description-toggle aria-expanded="false">Xem thêm</button>
      </div>
    </section>
  `;
}
