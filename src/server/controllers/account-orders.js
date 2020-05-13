import { intersection, pick } from 'lodash';

import { getClient } from '../lib/graphql';
import { gql as gqlV2 } from '../lib/utils';
import { logger } from '../logger';

const query = gqlV2/* GraphQL */ `
  query account(
    $slug: String!
    $filter: AccountOrdersFilter
    $status: [OrderStatus]
    $tierSlug: String
    $limit: Int
    $offset: Int
  ) {
    account(slug: $slug) {
      orders(filter: $filter, status: $status, tierSlug: $tierSlug, limit: $limit, offset: $offset) {
        limit
        offset
        totalCount
        nodes {
          fromAccount {
            name
            slug
            type
            imageUrl
            website
            twitterHandle
          }
          amount {
            value
          }
          tier {
            slug
          }
          frequency
          status
          totalDonations {
            value
          }
          createdAt
        }
      }
    }
  }
`;

const accountOrders = async (req, res) => {
  const variables = pick({ ...req.params, ...req.query }, ['slug', 'filter', 'status', 'tierSlug', 'limit', 'offset']);
  variables.limit = Number(variables.limit) || 100;
  variables.offset = Number(variables.offset) || 0;

  if (variables.status) {
    variables.status = intersection(variables.status.toUpperCase().split(','), [
      'ACTIVE',
      'CANCELLED',
      'ERROR',
      'PAID',
      'PENDING',
    ]);
  } else {
    variables.status = ['ACTIVE', 'CANCELLED', 'PAID'];
  }

  if (variables.tierSlug) {
    variables.filter = 'INCOMING';
  } else if (variables.filter) {
    variables.filter = variables.filter.toUpperCase();
  }

  try {
    const result = await getClient({ version: 'v2' }).request(query, variables);
    res.send(result.account.orders);
  } catch (err) {
    if (err.message.match(/No collective found/)) {
      return res.status(404).send('Not found');
    }
    logger.error(`Error while fetching collective orders: ${err.message}`);
    res.status(400).send(`Error while fetching collective orders.`);
  }
};

export default accountOrders;
