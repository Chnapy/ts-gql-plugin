import { gql } from 'graphql-tag';
import { useQuery } from '@apollo/client';

const { data } = useQuery(
  gql(`#graphql
  query UserFoo($id: ID!) {
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
