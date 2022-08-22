import { useQuery } from '@apollo/client';
import { gql } from 'graphql-tag';

const { data } = useQuery(
  gql(`
  query CatalogUserFoo($id: ID!) {
    user(id: $id) {
      id
      name
    }
    users {
      id
    }
  }
`)
);

console.log(
  // @ts-expect-error toto does not exist in { user, users }
  data?.toto
);

const ignored = gql`
  query ProfileUserignored {
    users {
      id
    }
  }
`;

// @ts-expect-error gql`` should be ignored by plugin and gives DocumentNode type
ignored.__apiType?.toString();
