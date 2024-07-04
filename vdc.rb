require 'sinatra'
require 'json'
require 'yaml'

get '/world' do
  room = YAML.load_file(File.join(Sinatra::Application.root, 'data', 'room.yml'))
  node_names = room['clusters'].map {|cluster| cluster['racks']}.flatten.map {|rack| rack['nodes']}.flatten.map{|node| node['name']}
  node_statuses = getNodeStatusesByNames(node_names)
  room['clusters'].each {|cluster| cluster['racks'].each {|rack| rack['nodes'].each {|node| node['status'] = node_statuses[node['name']]}}}
  return room.to_json
end

get '/node' do
  node_id = params['nodeId']
  node_name = getNodeNameById(node_id)
  node_status = getNodeStatusByName(node_name)
  until params['until'].nil? || params['until'].split(',').include?(node_status)
    node_status = getNodeStatusByName(node_name)
  end
  {
    nodeId: node_id,
    status: node_status
  }.to_json
end

post '/node' do
  requestBody = JSON.parse(request.body.read)

  case requestBody['action']
  when 'start'
    return startNode(requestBody['nodeId'])
  when 'stop'
    return stopNode(requestBody['nodeId'])
  when 'move'
    return moveNode(requestBody['nodeId'], requestBody['targetClusterId'], requestBody['targetRackIndex'], requestBody['targetTopSlotIndex'])
  end
end

def startNode(node_id)
  node_name = getNodeNameById(node_id)
  on_script = "scripts/on"
  Open3.capture3("#{on_script} #{node_name}")
  {
    nodeId: node_id
  }.to_json
end

def stopNode(node_id)
  node_name = getNodeNameById(node_id)
  off_script = "scripts/off" 
  Open3.capture3("#{off_script} #{node_name}")
  {
    nodeId: node_id
  }.to_json
end

def moveNode(node_id, target_cluster_id, target_rack_index, target_top_slot_index)
  room = YAML.load_file(File.join(Sinatra::Application.root, 'data', 'room.yml'))
  node = nil
  original_rack = room['clusters'].map { |cluster| cluster['racks'] }.flatten.find do |r|
    node = r['nodes'].find { |n| n['id'] == node_id }
  end
  target_rack = room['clusters'].find { |cluster| cluster['id'] = target_cluster_id }['racks'][target_rack_index]
  target_slot_indices = (target_top_slot_index...(target_top_slot_index + node['uNumber'])).to_a
  target_slot_occupied = target_rack['nodes'].any? do |n|
    node_slot_indices = (n['index']...(n['index'] + n['uNumber'])).to_a
    !(node_slot_indices & target_slot_indices).empty? && n['id'] != node_id
  end 

  if target_slot_occupied
    halt 400, 'Slot(s) Unavailable'
  else
    node['index'] = target_top_slot_index
    original_rack['nodes'].delete(node)
    target_rack['nodes'].push(node)
    # might could sort the target_rack here
    File.open(File.join(Sinatra::Application.root, 'data', 'room.yml'), 'w') { |file| file.write(room.to_yaml) }
    return {
      nodeId: node_id,
      clusterId: target_cluster_id,
      rackIndex: target_rack_index,
      topSlotIndex: target_top_slot_index
    }.to_json
  end
end

def getNodeNameById(node_id)
  room = YAML.load_file(File.join(Sinatra::Application.root, 'data', 'room.yml'))
  room['clusters'].each do |cluster|
    cluster['racks'].each do |rack|
      rack['nodes'].each do |node|
        return node['name'] if node['id'] == node_id
      end
    end
  end
end

def getNodeStatusByName(node_name)
  return getNodeStatusesByNames([node_name])[node_name]
end

def getNodeStatusesByNames(node_names)
  status_script = "scripts/status"
  stdout, stderr, status = Open3.capture3("#{status_script} #{node_names.join(",")}")
  return Hash[stdout.split("\n").map {|node_status| node_status.split(': ')}]
end
