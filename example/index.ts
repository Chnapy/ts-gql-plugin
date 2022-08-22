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

const { data: foo } = useQuery(
  gql(`
  query ProfileUser1($id: ID!) {
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

const { data: azer } = useQuery(
  gql(`
  query ProfileUser2($id: ID!) {
    authByGoogle(code: "foo") {
      id
      accessToken
    }
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
console.log(foo?.users[0].id);
console.log(azer?.authByGoogle.accessToken);
