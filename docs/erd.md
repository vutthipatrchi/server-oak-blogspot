# Oak Blogspot ERD

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : has
  PROFILES ||--o{ ARTICLES : writes
  CATEGORIES ||--o{ ARTICLES : categorizes
  ARTICLES ||--o{ COMMENTS : contains
  PROFILES ||--o{ COMMENTS : writes
  ARTICLES ||--o{ ARTICLE_LIKES : receives
  PROFILES ||--o{ ARTICLE_LIKES : gives

  AUTH_USERS {
    uuid id PK
    text email
  }

  PROFILES {
    uuid id PK,FK
    text email UK
    text name
    text username UK
    text bio
    text avatar_url
    text role "owner | admin | member"
  }

  CATEGORIES {
    bigint id PK
    text name UK
    text description
  }

  ARTICLES {
    bigint id PK
    uuid author_id FK
    bigint category_id FK
    text title
    text status "draft | published"
    text image_url
  }

  COMMENTS {
    bigint id PK
    bigint article_id FK
    uuid member_id FK
    text text
  }

  ARTICLE_LIKES {
    bigint article_id PK,FK
    uuid member_id PK,FK
  }
```

`owner` and `admin` can create, update, and delete articles. Only `owner` can
update the website-owner profile. `member` can comment and like articles.
Authorization is enforced by the Express middleware; database foreign keys
enforce entity relationships.
