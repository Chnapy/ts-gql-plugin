import { useQuery } from '@apollo/client';
import { gql } from 'graphql-tag';

const { data: abc } = useQuery(
  gql(`
  query CatalogUser1($id: ID!) {
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

const { data } = useQuery(
  gql(`
  query CatalogUser2($id: ID!) {
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

console.log(abc?.user.name);
console.log(data?.user.name);
